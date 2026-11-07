import { IconType } from "react-icons";
import {
    FaDownload, FaFile, FaFileAlt, FaFileArchive, FaFileAudio, FaFileCode, FaFileExcel,
    FaFileImage, FaFilePdf, FaFilePowerpoint, FaFileVideo, FaFileWord
} from "react-icons/fa";
import { FileKind, getFileExtension, getFileKind } from "../utils/FileUtils";

export const FILE_KIND_ICONS: Record<FileKind, { icon: IconType; color: string }> = {
    image: { icon: FaFileImage, color: "#6f42c1" },
    pdf: { icon: FaFilePdf, color: "#dc3545" },
    archive: { icon: FaFileArchive, color: "#b8860b" },
    code: { icon: FaFileCode, color: "#0d6efd" },
    text: { icon: FaFileAlt, color: "#6c757d" },
    audio: { icon: FaFileAudio, color: "#d63384" },
    video: { icon: FaFileVideo, color: "#fd7e14" },
    document: { icon: FaFileWord, color: "#2b579a" },
    spreadsheet: { icon: FaFileExcel, color: "#217346" },
    presentation: { icon: FaFilePowerpoint, color: "#d24726" },
    other: { icon: FaFile, color: "#6c757d" },
};

export const FileKindIcon = ({ name, mimetype, size = 20 }: { name: string; mimetype?: string; size?: number }) => {
    const { icon: Icon, color } = FILE_KIND_ICONS[getFileKind(name, mimetype)];
    return <Icon size={size} color={color} aria-hidden />;
};

interface FileAttachmentLinkProps {
    url: string;
    name: string;
}

/** Inline download card for uploaded (non-image) files. Uses only inline elements so it can live inside <p>. */
const FileAttachmentLink = ({ url, name }: FileAttachmentLinkProps) => {
    const ext = getFileExtension(name);
    return (
        <a
            href={url}
            download={name}
            className="wb-file-attachment"
            title={`Download ${name}`}
            onClick={e => e.stopPropagation()}
        >
            <FileKindIcon name={name} size={22} />
            <span className="wb-file-attachment__info">
                <span className="wb-file-attachment__name">{name}</span>
                {ext && <span className="wb-file-attachment__ext">{ext.toUpperCase()} file</span>}
            </span>
            <FaDownload className="wb-file-attachment__download" aria-hidden />
        </a>
    );
};

export default FileAttachmentLink;
