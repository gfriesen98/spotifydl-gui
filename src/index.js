require('dotenv').config()
const {
    FlexLayout,
    QLabel,
    QLineEdit,
    QPlainTextEdit,
    QMainWindow,
    QPushButton,
    QWidget,
    QScrollBar,
} = require('@nodegui/nodegui');
const youtube = require('scrape-youtube');
const { getPreview, getTracks, getData } = require('spotify-url-info');
const { spawn } = require('child_process');
const { access, rename, rm, writeFile, unlink, readFile } = require('fs/promises');
const { mkdirSync, createWriteStream, readFileSync } = require('fs');
const extract = require('extract-zip');
const { default: axios } = require('axios');
const path = require('path');
const spotify_prefixes = ['https://open.spotify.com/track', 'https://play.spotify.com/track', 'https://open.spotify.com/playlist', 'https://open.spotify.com/album'];
const ffmpeg_urls = {
    macos: [
        { name: 'ffmpeg.zip', url: 'https://evermeet.cx/ffmpeg/ffmpeg-5.0.zip' },
        { name: 'ffprobe.zip', url: 'https://evermeet.cx/ffmpeg/ffprobe-105504-g04cc7a5548.zip' }
    ],
    windows: 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip',
    linux: 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz'
}
const rootStyleSheet = require('./styles/rootStyleSheet');
const yt_dlp_version = require('./utility/yt_dlp_version.json');

const yt_dlp_binary = getYtdlpBinaryName();
const ffmpeg_binary = getFfmpegBinaryName();

/**
 * Gets the correct binary name to download yt-dlp
 * @returns Binary name
 */
function getYtdlpBinaryName() {
    if (process.env.ENVIRONMENT === 'development') {
        return 'yt-dlp.exe';
    } else {
        return process.platform === 'win32' ? 'yt-dlp.exe'
            : process.platform === 'linux' ? 'yt-dlp'
                : process.platform === 'darwin' && 'yt-dlp_macos'
    }
}

function getFfmpegBinaryName() {
    if (process.env.ENVIRONMENT === 'development') {
        return 'ffmpeg.exe';
    } else {
        return process.platform === 'win32' ? 'ffmpeg.exe'
            : process.platform === 'linux' ? 'ffmpeg'
                : process.platform === 'darwin' && 'ffmpeg'
    }
}

/**
 * Checks for ffmpeg and yt-dlp on startup
 * @param {QPlainTextEdit} output Output box
 * @returns {boolean}
 */
async function check_deps_win(output) {
    let has_ytdlp = false;
    let current_ytdlp_version = yt_dlp_version.current;
    let has_path = false;
    let errors = {
        filesystem: false,
        ytdl_download: false,
        ffmpeg_download: false,
        network_error: false
    };

    output.insertPlainText('[setup]: Wait for "Ready!" before using!\n\n');
    output.insertPlainText('[setup]: Checking for dependencies...\n');

    try {
        await access('./binaries');
        has_path = true;
    } catch (err) {
        console.log('binaries path does not exist');
    }

    if (!has_path) {
        try {
            mkdirSync('./binaries');
        } catch (err) {
            console.error(err);
            output.insertPlainText('\n[ERROR]: Could not create binaries folder: ' + err.message + "\n");
            errors.filesystem = true;
        }
    }

    try {
        await access(`./binaries/${yt_dlp_binary}`);
        has_ytdlp = true;
        console.log('has yt-dlp');
        output.insertPlainText('[setup]: Has yt-dlp\n');
    } catch (err) {
        console.log('does not have yt-dlp');
        output.insertPlainText('[setup]: Needs yt-dlp\n');
    }

    // check latest the yt-dlp version
    let latest_releases = null;
    let latest_ytdlp_version = "";
    try {
        output.insertPlainText('[setup]: Checking for latest yt-dlp version...');
        latest_releases = await axios.get('https://api.github.com/repos/yt-dlp/yt-dlp/releases');
        latest_ytdlp_version = latest_releases.data[0].tag_name;
        output.insertPlainText(`\t${latest_ytdlp_version}...\t`);

        // yt_dlp_version.current should equal "" on fresh build so set it
        if (current_ytdlp_version === "") {
            yt_dlp_version.current = latest_ytdlp_version;
            await writeFile(path.resolve('./utility/yt_dlp_version.json'), JSON.stringify(yt_dlp_version))
        
        // yt_dlp_version.current should contain a string value after first launch
        } else if (latest_ytdlp_version !== current_ytdlp_version) {
            has_ytdlp = false;
            yt_dlp_version.current = latest_ytdlp_version;
            output.insertPlainText(`\t Update needed!!\n`);
            await writeFile(path.resolve('./utility/yt_dlp_version.json'), JSON.stringify(yt_dlp_version));

        // same ver
        } else { 
            output.insertPlainText(`\t No update needed...\n`);
        }

    } catch (err) {
        console.warn('network error, could not reach https://api.github.com/repos/yt-dlp/yt-dlp/releases. continuing anyways', err);
        output.insertPlainText('\n[ERROR]:\tNetwork Error: Could not reach https://api.github.com/repos/yt-dlp/yt-dlp/releases. Probably no internet. Continuing anyways.\n');
        errors.network_error = true;
    }

    // download yt-dlp
    if (!has_ytdlp) {
        try {
            output.insertPlainText('[setup]: Downloading yt-dlp...\n');
            const url = `https://github.com/yt-dlp/yt-dlp/releases/download/${latest_ytdlp_version}/${yt_dlp_binary}`;
            const res = await axios.get(url, { responseType: 'stream' });
            const dest = createWriteStream('./binaries/' + yt_dlp_binary); // ,{ mode: 0o755 }
            await res.data.pipe(dest);
        } catch (err) {
            console.log(err);
            output.insertPlainText('[ERROR]: There was an issue dealing with yt-dlp:\n' + err.message + '\n\n...Will try to continue\n\n');
            errors.ytdl_download = true;
        }
        output.insertPlainText('[setup]: Finished downloading yt-dlp\n');
    }

    // check for ffmpeg
    let has_ffmpeg = false;
    try {
        await access(`./binaries/${ffmpeg_binary}`);
        has_ffmpeg = true;
        console.log('has ffmpeg');
        output.insertPlainText('[setup]: Has ffmpeg\n');
    } catch (err) {
        console.log('does not have ffmpeg');
        output.insertPlainText('[setup]: Needs ffmpeg. Will download it\n');
    }

    if (!has_ffmpeg) {
        try {
            output.insertPlainText('[setup]: Downloading ffmpeg...\n');

            if (process.platform === 'win32') {
                const res = await axios.get(ffmpeg_urls.windows, { responseType: 'arraybuffer' });
                await writeFile(path.resolve('./binaries/ffmpeg.zip'), res.data, { encoding: 'binary' });

                output.insertPlainText('[setup]: Extracting ffmpeg\n');
                await extract('./binaries/ffmpeg.zip', { dir: path.resolve('./binaries/') });

                output.insertPlainText('[setup]: Cleaning up...\n');
                await rename('./binaries/ffmpeg-5.0-essentials_build/bin/ffmpeg.exe', './binaries/ffmpeg.exe');
                await rename('./binaries/ffmpeg-5.0-essentials_build/bin/ffprobe.exe', './binaries/ffprobe.exe');
                await rm('./binaries/ffmpeg-5.0-essentials_build', { recursive: true, force: true });
                await unlink('./binaries/ffmpeg.zip');
            } else if (process.platform === 'linux') {
                const res = await axios.get(ffmpeg_urls.linux, { responseType: 'arraybuffer' });
                await writeFile(path.resolve('./binaries/ffmpeg.tar.gz'), res.data, { encoding: 'binary' });

                output.insertPlainText('[setup]: Extracting ffmpeg\n');
                let linux_extract = spawn('tar', ['-xf', './binaries/ffmpeg.tar.gz']);
                linux_extract.stdout.on('data', output => {
                    console.log(output);
                    output.insertPlainText(`[tar -xf]: ${output.trim()}`);
                });
                linux_extract.stderr.on('data', data => console.warn("TAR -XF ERROR: ", data));
                linux_extract.on('error', err => console.error(err));
                linux_extract.on('close', code => console.log(`tar -xf ./binaries/ffmpeg.tar.gz exited with code ${code}`));

                output.insertPlainText('[setup]: Cleaning up...\n');
                await rename('./binaries/ffmpeg-5.0-amd64-static/ffmpeg', './binaries/ffmpeg');
                await rename('./binaries/ffmpeg-5.0-amd64-static/ffprobe', './binaries/ffprobe');
                await rm('./binaries/ffmpeg-5.0-amd64-static', { recursive: true, force: true });
                await unlink('./binaries/ffmpeg.tar.gz')
            } else if (process.platform === 'darwin') {
                for (const download of ffmpeg_urls.macos) {
                    const res = await axios.get(download.url, { responseType: 'arraybuffer' });
                    await writeFile(path.resolve('./binaries/' + download.name), res.data, { encoding: 'binary' });

                    output.insertPlainText('[setup]: Extracting ffmpeg and cleaning up...\n');
                    await extract('./binaries/' + download.name, { dir: path.resolve('./binaries/') });
                    await unlink('./binaries/' + download.name);
                }
            }
        } catch (err) {
            console.log(err);
            output.insertPlainText('[ERROR]: There was an issue dealing with ffmpg:\n' + err.message + "\n\nWill try to continue\n\n");
            errors.ffmpeg_download = true;
        }
    }


    // show help logs on depenency load errors
    let helper_message = ["\n[ERROR] There were some errors when trying to deal with dependencies:", "This program requires yt-dlp and ffmpeg binaries (.exe's) to be located in the 'binaries' folder of spotifydl-gui", "First, make sure the 'binaries' folder exists before continuing"];
    if (errors.network_error) {
        helper_message.push(`There was an issue accessing download URL's. Check if you have internet connection.`);
    } else if (errors.ytdl_download) {
        helper_message.push(`There was an issue downloading yt-dlp. Download the required windows .exe here: https://github.com/yt-dlp/yt-dlp/releases/download/${latest_releases ? latest_releases : 'ERROR_NO_LATEST_RELEASE_LOL'}/yt-dlp.exe`);
        helper_message.push(`View latest releases here: https://github.com/yt-dlp/yt-dlp/releases (Downloads are under 'Assets')`);
        helper_message.push(`Windows: download yt-dlp.exe`);
        helper_message.push(`Linux: download yt-dlp`);
        helper_message.push(`Mac: download yt-dlp_macos`);
        helper_message.push(`Move the downloaded file into the 'binaries' folder once downloaded`);
    } else if (errors.ffmpeg_download) {
        helper_message.push(`There was an issue downloading ffmpeg. Download the required windows zip here: https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip`);
        helper_message.push(`1. Right click the downloaded zip and extract into `)
    }
    else {
        helper_message.push(``)
    }


    output.insertPlainText('Ready!');
}

async function main() {
    const win = new QMainWindow();
    win.setWindowTitle('spotifydl-gui');
    win.setFixedSize(800, 600);

    // Root view
    const rootView = new QWidget();
    const rootViewLayout = new FlexLayout();
    rootView.setObjectName('rootView');
    rootView.setLayout(rootViewLayout);

    // Fieldset
    const fieldset = new QWidget();
    const fieldsetLayout = new FlexLayout();
    fieldset.setObjectName('fieldset');
    fieldset.setLayout(fieldsetLayout);

    // URL row
    const urlLayout = new QWidget();
    const urlRowLayout = new FlexLayout();
    const urlLabel = new QLabel();
    const urlInput = new QLineEdit();
    urlLayout.setObjectName('numCharsRow');
    urlLayout.setLayout(urlRowLayout);

    urlLabel.setText('spotify url: ');
    urlRowLayout.addWidget(urlLabel);

    urlInput.setObjectName('numCharsInput');
    urlRowLayout.addWidget(urlInput);

    // Download dir row
    const downloadDirLayout = new QWidget();
    const downloadDirRowLayout = new FlexLayout();
    const downloadDirLabel = new QLabel();
    const downloadDirInput = new QLineEdit();
    downloadDirLayout.setObjectName('downloadDirLayout');
    downloadDirLayout.setLayout(downloadDirRowLayout);

    downloadDirLabel.setText('download location: ');
    downloadDirRowLayout.addWidget(downloadDirLabel);

    downloadDirInput.setObjectName('downloadDirInput');
    downloadDirRowLayout.addWidget(downloadDirInput);


    // Output box
    const output = new QPlainTextEdit();
    const scrollbar = new QScrollBar();      // Define a new scrollbar to set autoscrolling
    output.setObjectName('output');
    output.setReadOnly(true);
    output.setWordWrapMode(3);

    scrollbar.setMaximum(scrollbar.value()); // not sure if needed tbh
    output.setVerticalScrollBar(scrollbar);  // apply new scrollbar to output box
    output.setVerticalScrollBarPolicy(2);    // policy 2: Always show scrollbar, 1: Show scrollbar when needed, 0: Hide scrollbar


    // Button row
    const buttonRow = new QWidget();
    const buttonRowLayout = new FlexLayout();
    buttonRow.setLayout(buttonRowLayout);
    buttonRow.setObjectName('buttonRow');

    // Buttons
    const downloadButton = new QPushButton();
    downloadButton.setText('Download');
    downloadButton.setObjectName('downloadButton');

    // Add the widgets to the respective layouts
    // fieldset
    fieldsetLayout.addWidget(urlLayout);
    fieldsetLayout.addWidget(downloadDirLayout);

    // buttonrow view
    buttonRowLayout.addWidget(downloadButton);

    // rootview
    rootViewLayout.addWidget(fieldset);
    rootViewLayout.addWidget(output);
    rootViewLayout.addWidget(buttonRow);

    // Event handling

    // scroll ouput terminal automatically
    output.addEventListener('textChanged', () => {
        scrollbar.setSliderPosition(scrollbar.maximum()); // set scroll position to the maximum (down)
    });

    // run download on button click
    downloadButton.addEventListener('clicked', async () => {
        let input = urlInput.text();
        const download_dir = downloadDirInput.text() === '' ? './dl' : downloadDirInput.text();

        output.setPlainText('');
        try {
            if (typeof (input) === 'undefined' || input === null) throw new Error('Please provide an input!');

            if (input.startsWith(spotify_prefixes[0]) || input.startsWith(spotify_prefixes[1])) {
                output.insertPlainText("[Spotify] Gathering info from Spotify...\n");
                const data = await getPreview(input);

                output.insertPlainText("[Youtube] Searching Youtube...\n");
                output.insertPlainText(`[Youtube] Using "${data.artist} - ${data.title}" as search query\n`);

                const youtube_data = await youtube.search(`${data.artist} - ${data.title} Audio`);
                if (youtube_data.videos.length === 0) throw new Error('No results found...');
                console.log(youtube_data);

                const youtube_input = youtube_data.videos[0].link;
                const youtube_name = youtube_data.videos[0].title;

                output.insertPlainText(`[Youtube] Found video:\n`);
                output.insertPlainText(`[Youtube] Title: ${youtube_name}\n`);
                output.insertPlainText(`[Youtube] URL: ${youtube_input}\n\n`);

                const options = ["-v", '-P', download_dir, "--ignore-errors", "--format", "bestaudio", "--extract-audio", "--audio-format", "mp3", "--audio-quality", "160K", "--output", `%(title)s.%(ext)s"`, youtube_input];

                const dl = spawn("./binaries/" + yt_dlp_binary, options);
                output.insertPlainText(`[yt-dlp PID=${dl.pid}] Executing yt-dlp\n[yt-dlp] Options: ${options.join(" ")}\n\n`);

                dl.stdout.on('data', data => {
                    let text = data.toString().trim();
                    if (text !== '' || text !== null) output.insertPlainText(text + "\n");
                });

                dl.stderr.on("data", data => {
                    // console.log('std err');
                    // console.log(data.toString())
                });

                dl.on('error', (e) => {
                    // console.log('err');
                    // console.log(e);
                })

                dl.on("close", code => {
                    console.log('finished');
                    output.insertPlainText("\n\nFinished\n");
                    output.insertPlainText("");
                });
            } else if (spotify_prefixes[3]) {
                output.insertPlainText("[Spotify] Gathering info from Spotify...\n");

            } else {
                throw new Error('Invalid URL provided');
            }
        } catch (err) {
            console.log(err.message);
            output.insertPlainText("\n" + err.message + "\n");
        }



        // output.setPlainText(urlInput.text())
        //   const passwordLength = numCharsInput.text();
        //   const includeSpecialChars = checkbox.isChecked();
        //   const charSet = getCharSet(includeSpecialChars);

        //   passOutput.setPlainText(
        //     generatePassword(passwordLength, charSet)
        //   );
    });

    // Apply styling
    rootView.setStyleSheet(rootStyleSheet);

    win.setCentralWidget(rootView);
    win.show();

    // check for dependencies
    check_deps_win(output);
    global.win = win;
}

main().catch(console.error);









/** check current version if we already have it
        // if (has_ytdlp) {
        //     const version_check = spawn(`./binaries/${yt_dlp_binary}`, ["--version"]);

        //     version_check.stdout.on('data', version => {
        //         console.log(version.toString());
        //         output.insertPlainText(`[${yt_dlp_binary}]: Current yt-dlp version: ${version.toString().trim()}`);
        //         current_ytdlp_version = version.toString().trim();
        //     });
        //     version_check.stderr.on('data', data => console.warn("YT-DLP ERROR: ", data.toString()));
        //     version_check.on('error', err => console.error(err));
        //     version_check.on('close', code => console.log(`${yt_dlp_binary} --version exited with code ${code}`));
        // }

        // if (current_ytdlp_version !== latest_ytdlp_version) {
        //     output.insertPlainText("[setup]: There is a new yt-dlp release, will download and update yt-dlp\n");
        //     try {
        //         output.insertPlainText("[setup]: Removing old yt-dlp.exe");
        //         await unlink(`./binaries/${yt_dlp_binary}`);
        //         has_ytdlp = false;
        //     } catch (err) {
        //         console.error(err);
        //         console.warn('trying to unlink yt-dlp.exe for upgrade, probably no issue: \n', err);
        //         has_ytdlp = false;
        //     }
        // }
        */