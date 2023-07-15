import { getDownloadURL, ref, uploadBytes } from "firebase/storage"
import { storage } from "../services/firebase.config"

const StorageClient = (function() {

    async function getUrl(path: string) {
        const storageRef = ref(storage, path)
        return await getDownloadURL(storageRef);
    }

    async function uploadFile(path: string, file: Blob) {
        const storageRef = ref(storage, path);
        return await uploadBytes(storageRef, file)
    }

    return {
        getUrl,
        uploadFile
    }

})()

export default StorageClient