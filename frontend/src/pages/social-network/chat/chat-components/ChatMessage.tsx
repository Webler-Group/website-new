import { useEffect, useState } from "react"
import DateUtils from "../../../../utils/DateUtils"
import TextUtils from "../../../../utils/TextUtils"
import parse from "html-react-parser"

function textToMessage(text: string) {
    const processWord = () => {
        if (TextUtils.isValidUrl(word)) {
            if (isFirstUrl) {
                isFirstUrl = false
                footer = word
            }
            result += `<a href="${word}">${word}</a>`
        }
        else {
            result += word
        }
        word = ""
    }
    text = text.trim()
    text = TextUtils.escapeHtml(text)
    let result = ""
    let footer = ""
    let word = ""
    let isFirstUrl = true
    for (let i = 0; i < text.length; ++i) {
        let ch = text.charAt(i)
        if (/\s/.test(ch)) {
            if (word.length) {
                processWord()
            }
            result += ch
        }
        else {
            word += ch
        }
    }
    if (word.length) {
        processWord()
    }
    return { text: result, url: footer }
}

function ChatMessage({ item, scrollToBottom }: any) {

    let date = DateUtils.format(new Date(item.timestamp))
    let message = textToMessage(item.text)
    const [footer, setFooter] = useState<any>(null)
    const [image, setImage] = useState("")

    useEffect(() => {
        if (message.url) {
            let tempImage = new Image()
            tempImage.onload = () => {
                setImage(message.url)
            }
            tempImage.src = message.url
            
            fetch("https://jsonlink.io/api/extract?url=" + message.url)
                    .then(response => {
                        return response.json()
                    })
                    .then(data => {
                        if(data.hasOwnProperty("title")) {
                            setFooter(data)
                        }
                    })
        }
    }, [])

    useEffect(() => {
        scrollToBottom()
    }, [footer])

    return (
        <div className="d-flex" style={{ gap: 12 }}>
            <div>
                {item.user && <a href={"/member/" + item.user.username} ><img width={34} height={34} className="rounded-circle" src={item.user.avatarUrl ? item.user.avatarUrl : "/resources/images/user.svg"} /></a>}
            </div>
            <div>
                <div>{item.user && <a className="NavLink" href={"/member/" + item.user.username}>{item.user.username}</a>} <small>{date}</small></div>
                <p style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{parse(message.text)}</p>
                {
                (footer) && 
                <div className="border rounded p-2" style={{ maxWidth: "300px", flex: 0 }}>
                     <h4>{footer.title}</h4>
                    {footer.description && <p>{footer.description.length < 64 ? footer.description : footer.description.slice(0, 64) + "…"}</p>}
                    {(footer.images && footer.images.length) && <img className="rounded" style={{ maxWidth: "240px" }} src={footer.images[0]} onError={(e) => (e.target as HTMLImageElement).hidden = true} onLoad={() => scrollToBottom()} />}
                </div>
                }
                {(image != null) && <img className="rounded" style={{ width:"70%" }} src={image} onLoad={() => scrollToBottom()} />}
            </div>
        </div>
    )
}

export default ChatMessage