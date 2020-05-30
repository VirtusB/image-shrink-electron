const path = require('path');
const os = require('os');
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const imagemin = require('imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');
const slash = require('slash');
const log = require('electron-log');

process.env.NODE_ENV = 'production';

const isDev = process.env.NODE_ENV !== 'production';
const isMac = process.platform === 'darwin';

let mainWindow;
let aboutWindow;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 500,
        height: 600,
        title: 'ImageShrink',
        icon: `${__dirname}/assets/icons/Icon_256x256.png`,
        resizable: !!isDev,
        backgroundColor: 'white',
        webPreferences: {
            nodeIntegration: true
        }
    });

    mainWindow.loadFile('./app/index.html');
}

function createAboutWindow() {
    aboutWindow = new BrowserWindow({
        width: 300,
        height: 300,
        title: 'About ImageShrink',
        icon: `${__dirname}/assets/icons/Icon_256x256.png`,
        resizable: false,
        backgroundColor: 'white'
    });

    aboutWindow.setMenu(null);
    aboutWindow.loadFile('./app/about.html');
}

const menu = [
    ...(isMac ? [{
        label: app.name,
        submenu: [
            {
                label: 'About',
                click: createAboutWindow
            }
        ]
    }] : []),
    {
        role: 'fileMenu'
    },
    ...(!isMac ? [
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About',
                    click: createAboutWindow
                }
            ]
        }
    ] : []),
    ...(isDev ? [
        {
            label: 'Developer',
            submenu: [
                {role: 'reload'},
                {role: 'forcereload'},
                {type: 'separator'},
                {role: 'toggledevtools'}
            ]
        }
        ] : [])
];

app.on('ready', () => {
    createMainWindow();

    const mainMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(mainMenu);

    mainWindow.on('closed', () => mainWindow = null);
});

ipcMain.on('image:optimize', (e, data) => {
    // const workingDir = process.cwd();
    // data.dest = path.join(workingDir, 'imageshrink')
    data.dest = path.join(os.homedir(), 'imageshrink');
    shrinkImage(data);
})

async function shrinkImage({imgPath, quality, dest}) {
    const pngQuality = quality / 100;

    try {
        const files = await imagemin([slash(imgPath)], {
            destination: dest,
            plugins: [
                imageminMozjpeg({quality}),
                imageminPngquant({
                    quality: [pngQuality, pngQuality]
                })
            ]
        });

        log.info(files);

        shell.openPath(dest);

        mainWindow.webContents.send('image:optimized');
    } catch (err) {
        console.log(err);
        log.error(err);
    }
}

app.on('window-all-closed', () => {
    if (!isMac) {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});