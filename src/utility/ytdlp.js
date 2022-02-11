const { default: axios } = require('axios');
const { writeFile, access } = require('fs/promises');
const yt_dlp_version = require('../../assets/yt_dlp_version.json');
const {yt_dlp_binary} = require('./binaryName');

async function getLatestYtdlpVersion(output) {
    try {
        output.insertPlainText('[setup]: Checking for latest yt-dlp version...\t');
        let latest_releases = await axios.get('https://api.github.com/repos/yt-dlp/yt-dlp/releases');
        let latest_version = latest_releases.data[0].tag_name;
        output.insertPlainText(`\t${latest_version}...\t`);

        return latest_version;

    } catch (err) {
        console.warn('network error, could not reach https://api.github.com/repos/yt-dlp/yt-dlp/releases. continuing anyways', err);
        output.insertPlainText('\n[ERROR]:\tNetwork Error: Could not reach https://api.github.com/repos/yt-dlp/yt-dlp/releases. Probably no internet. Continuing anyways.\n');
        errors.network_error = true;
        if (yt_dlp_version.current !== "") {
            return yt_dlp_version.current;
        } else {
            return null;
        }
    }
}

/**
 * Checks the binaries folder for yt-dlp
 * @returns {boolean} boolean
 */
async function checkYtdlpBinary(output) {
    try {
        await access(`./binaries/${yt_dlp_binary}`);
        output.insertPlainText('[setup]: Has yt-dlp\n');
        return true;
    } catch (err) {
        console.error(err);
        output.insertPlainText('[setup]: Needs yt-dlp\n');
        return false;
    }
}

module.exports = {

    /**
     * 
     * @param { QPlainTextEdit } output Output widget
     */
    checkYtdlpVersion: async function (output) {
        // let has_ytdlp = await checkYtdlpBinary(output);
        let has_ytdlp = false;

        try {
            await access(`./binaries/${yt_dlp_binary}`);
            output.insertPlainText('[setup]: Has yt-dlp\n');
            has_ytdlp = true;
        } catch (err) {
            console.error(err);
            output.insertPlainText('[setup]: Needs yt-dlp\n');
            has_ytdlp = false;
        }

        console.log(has_ytdlp);
        let latest_ytdlp_version = await getLatestYtdlpVersion(output);

        // yt_dlp_version.current should equal "" on fresh build so set it
        if (yt_dlp_version.current === "") {
            has_ytdlp = false;
            yt_dlp_version.current = latest_ytdlp_version;
            await writeFile('./assets/yt_dlp_version.json', JSON.stringify(yt_dlp_version));

        // yt_dlp_version.current should contain a string value after first launch
        } else if (yt_dlp_version.current !== latest_ytdlp_version) {
            has_ytdlp = false;
            yt_dlp_version.current = latest_ytdlp_version;
            output.insertPlainText(`\t Update needed!!\n`);
            await writeFile('./assets/yt_dlp_version.json', JSON.stringify(yt_dlp_version));

        // same version
        } else {
            output.insertPlainText(`\t No update needed...\n`);
        }
        return { has_ytdlp, latest_ytdlp_version };
    }
}