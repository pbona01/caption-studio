import { Capacitor } from '@capacitor/core'
import { FileTransfer } from '@capacitor/file-transfer'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

export async function saveOrShareVideo(url: string, filename: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    return
  }

  const file = await Filesystem.getUri({ directory: Directory.Cache, path: filename })
  await FileTransfer.downloadFile({ url, path: file.uri })
  await Share.share({
    title: 'Caption Studio video',
    text: 'Exported MP4 video',
    url: file.uri,
    dialogTitle: 'Save or share your video',
  })
}
