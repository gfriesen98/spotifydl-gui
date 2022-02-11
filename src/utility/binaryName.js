module.exports = {
    ffmpeg_binary: process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg',

    yt_dlp_binary: 
        process.platform === 'win32' ? 'yt-dlp.exe'
            : process.platform === 'linux' ? 'yt-dlp' 
                : process.platform === 'darwin' && 'yt-dlp_macos',

    ffmpeg_urls: {
        macos: [
            { name: 'ffmpeg.zip', url: 'https://evermeet.cx/ffmpeg/ffmpeg-5.0.zip' },
            { name: 'ffprobe.zip', url: 'https://evermeet.cx/ffmpeg/ffprobe-105504-g04cc7a5548.zip' }
        ],
        windows: 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip',
        linux: 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz'
    }
}