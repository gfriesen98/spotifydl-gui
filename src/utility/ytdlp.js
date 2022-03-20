const { default: axios } = require('axios');
const { spawn } = require('child_process');
const { writeFile, access } = require('fs/promises');
const {yt_dlp_binary} = require('./constants'); 
const yt_dlp_version = require('../../assets/yt_dlp_version.json');
const path = require('path');

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

module.exports = {
    
    checkYtdlpVersion: async function (output) {
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
    },

    YtDlp:{

        /**
         * Spawns a yt-dlp process to download and convert a youtube video to mp3
         * @param {string} url youtube url
         * @param {string} download_dir download directory
         * @param {string} filename_template template to rename file. Defaults to '%(title)s.%(ext)s' (yt-dlp specific templating)
         * @param {QPlainTextEdit} output
         * @param {Object} options yt-dlp options: album_name, file_type
         * @returns {Promise} Promise object resolves on exit
         */
        downloadTrack: function (url, download_dir, filename_template = `%(title)s.%(ext)s`, output, options) {
            return new Promise(function(resolve, reject) {
                const yt_dlp_options = [
                    // ignore errors
                    // "-v", "--ignore-errors",
                    "--ignore-errors",

                    // set download dir
                    "-P", download_dir,

                    // set audio format
                    "--format", "bestaudio",

                    // metadata settings, replace the album field with the album name from spotify, sometimes it can be different [A-Za-z0-9]
                    "--embed-metadata", "--replace-in-metadata", "album", ".+", `${options.album_name}`,

                    // audio settings
                    "--extract-audio", "--embed-thumbnail",
                    "--audio-format", options.file_type,
                    "--audio-quality", "0", // default bestquality

                    // output settings & download url
                    "--output", `${filename_template.replace('/', ' ').replace(/  +/g, ' ')}`,
                    url
                ];
                const yt_dlp = spawn("./binaries/" + yt_dlp_binary, yt_dlp_options);
        
                yt_dlp.stdout.on('data', data => {
                    let text = data.toString().trim();
                    if (text !== '' || text !== null) {
                        if (text.startsWith('[info] Downloading video thumbnail')) {
                            output.insertPlainText(`[yt-dlp] Downloading video thumbnail\n`);
                        } else if (text.includes('ETA')) {
                            output.insertPlainText(`${text.replace('[download] ', '[yt-dlp] ')}\n`);
                        } else if (text.includes('100%')) {
                            output.insertPlainText(`[yt-dlp] Finished downloading\n`);
                        } else {
                            // output.insertPlainText(`${text}\n`);
                        }
                    }
                });
        
                yt_dlp.on('error', (e) => {
                    console.error(e);
                    reject(e);
                });

                yt_dlp.stderr.on('data', data => {
                    console.error(data.toString());
                })
        
                yt_dlp.on('exit', code => {
                    console.log('exited with code ' + code);
                    output.insertPlainText("Finished track with exit code " + code + "\n");
                    output.insertPlainText("Saved track to "+path.resolve(download_dir)+"\n\n");
                    resolve(code);
                });
            });
        }
    }
}