module.exports = {
    getYtdlpBinaryName: function() {
        if (process.env.ENVIRONMENT === 'development') {
            return 'yt-dlp.exe';
        } else {
            return process.platform === 'win32' ? 'yt-dlp.exe'
                : process.platform === 'linux' ? 'yt-dlp'
                    : process.platform === 'darwin' && 'yt-dlp_macos'
        }
    },
    
    getFfmpegBinaryName: function() {
        if (process.env.ENVIRONMENT === 'development') {
            return 'ffmpeg.exe';
        } else {
            return process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
        }
    }
}