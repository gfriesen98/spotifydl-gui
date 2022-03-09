const { access, mkdir } = require('fs/promises');
const { createWriteStream } = require('fs');
const { default: Axios } = require('axios');
const { 
    checkFfmpegExists, downloadWin32,
    downloadLinux, downloadMacos 
} = require('./ffmpeg');
const { checkYtdlpVersion } = require('./ytdlp');
const YT_DLP_BINARY = require('./constants').yt_dlp_binary;

/**
 * Checks for ffmpeg and yt-dlp on startup
 * @param {QPlainTextEdit} output Output box
 * @returns {boolean}
 */
 module.exports = async function checkDependencies(output, button) {
    output.insertPlainText('[setup]: Wait for "Ready!" before using!\n\n');
    output.insertPlainText('[setup]: Checking for dependencies...\n');

    // check for binaries folder
    try {
        await access('./binaries');
    } catch (err) {
        console.log('binaries path does not exist');
        try {
            await mkdir('./binaries');
        } catch (err) {
            console.error(err);
            output.insertPlainText('\n[ERROR]: Could not create binaries folder: ' + err.message + "\n");
        }
    }

    // Get yt-dlp latest version and check if we need to download an update
    const { has_ytdlp, latest_ytdlp_version } = await checkYtdlpVersion(output);

    // Check if we need to download yt-dlp
    if (!has_ytdlp) {
        try {
            output.insertPlainText('[setup]: Downloading yt-dlp...\n');
            const url = `https://github.com/yt-dlp/yt-dlp/releases/download/${latest_ytdlp_version}/${YT_DLP_BINARY}`;
            const res = await Axios.get(url, { responseType: 'stream' });
            const dest = createWriteStream('./binaries/' + YT_DLP_BINARY); // ,{ mode: 0o755 }
            await res.data.pipe(dest);
        } catch (err) {
            console.log(err);
            output.insertPlainText('[ERROR]: There was an issue dealing with yt-dlp:\n' + err.message + '\n\n...Will try to continue\n\n');
        }
        output.insertPlainText('[setup]: Finished downloading yt-dlp\n');
    }

    // check if ffmpeg exists
    const has_ffmpeg = await checkFfmpegExists(output);

    if (!has_ffmpeg) {
        try {
            output.insertPlainText('[setup]: Downloading ffmpeg...\n');

            if (process.platform === 'win32') {
                await downloadWin32(output);
            } else if (process.platform === 'linux') {
                await downloadLinux(output)
            } else if (process.platform === 'darwin') {
                await downloadMacos(output);
            }

        } catch (err) {
            console.log(err);
            output.insertPlainText('[ERROR]: There was an issue dealing with ffmpg:\n' + err.message + "\n\nWill try to continue\n\n");
            errors.ffmpeg_download = true;
        }
    }
    output.insertPlainText('Ready!');
    button.setEnabled(true);
}