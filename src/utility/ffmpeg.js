const {ffmpeg_binary, ffmpeg_urls} = require('./constants');
const { default: axios } = require('axios');
const { access, rename, rm, writeFile, unlink } = require('fs/promises');
const extract = require('extract-zip');
const path = require('path');

async function downloadMacos(output) {
    for (const download of ffmpeg_urls.macos) {
        const res = await axios.get(download.url, { responseType: 'arraybuffer' });
        await writeFile(path.resolve('./binaries/' + download.name), res.data, { encoding: 'binary' });

        output.insertPlainText('[setup]: Extracting ffmpeg and cleaning up...\n');
        await extract('./binaries/' + download.name, { dir: path.resolve('./binaries/') });
        await unlink('./binaries/' + download.name);
    }
}

async function downloadLinux(output) {
    const res = await axios.get(ffmpeg_urls.linux, { responseType: 'arraybuffer' });
    await writeFile(path.resolve('./binaries/ffmpeg.tar.gz'), res.data, { encoding: 'binary' });

    output.insertPlainText('[setup]: Extracting ffmpeg\n');
    let linux_extract = spawn('tar', ['-xf', './binaries/ffmpeg.tar.gz']);
    linux_extract.stdout.on('data', output => {
        console.log(output);
        output.insertPlainText(`[tar -xf]: ${output.trim()}`);
    });
    linux_extract.stderr.on('data', data => console.warn("TAR ERROR: ", data));
    linux_extract.on('error', err => console.error(err));
    linux_extract.on('close', code => console.log(`tar -xf ./binaries/ffmpeg.tar.gz exited with code ${code}`));

    output.insertPlainText('[setup]: Cleaning up...\n');
    await rename('./binaries/ffmpeg-5.0-amd64-static/ffmpeg', './binaries/ffmpeg');
    await rename('./binaries/ffmpeg-5.0-amd64-static/ffprobe', './binaries/ffprobe');
    await rm('./binaries/ffmpeg-5.0-amd64-static', { recursive: true, force: true });
    await unlink('./binaries/ffmpeg.tar.gz')
}

async function downloadWin32(output) {
    const res = await axios.get(ffmpeg_urls.windows, { responseType: 'arraybuffer' });
    await writeFile(path.resolve('./binaries/ffmpeg.zip'), res.data, { encoding: 'binary' });

    output.insertPlainText('[setup]: Extracting ffmpeg\n');
    await extract('./binaries/ffmpeg.zip', { dir: path.resolve('./binaries/') });

    output.insertPlainText('[setup]: Cleaning up...\n');
    await rename('./binaries/ffmpeg-5.0-essentials_build/bin/ffmpeg.exe', './binaries/ffmpeg.exe');
    await rename('./binaries/ffmpeg-5.0-essentials_build/bin/ffprobe.exe', './binaries/ffprobe.exe');
    await rm('./binaries/ffmpeg-5.0-essentials_build', { recursive: true, force: true });
    await unlink('./binaries/ffmpeg.zip');
}

async function checkFfmpegExists(output) {
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

    return has_ffmpeg;
}

module.exports = { checkFfmpegExists, downloadWin32, downloadLinux, downloadMacos };