import { SyntheticEvent, useEffect, useState } from "react"

const apikey = "LIVDSRZULELA"
const lmt = 50

function GifSearchBar({ onSelect }: any) {

    const [searchTerm, setSearchTerm] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>()

    useEffect(() => {
        const searchUrl = "https://g.tenor.com/v1/search?q=" + searchTerm + "&key=" +
            apikey + "&limit=" + lmt;
        fetch(searchUrl)
            .then(response => response.json())
            .then(data => {
                setSearchResults(data.results)
            })
    }, [searchTerm])

    function onSearchBoxChange(e: SyntheticEvent) {
        let value = (e.target as HTMLInputElement).value
        setSearchTerm(value)
    }

    return (
        <div className="p-3 rounded border d-flex flex-column w-100 h-100 " style={{background: "var(--navBarBgColor)"}}>
            <h4>GIFs</h4>
            <div>
                <input value={searchTerm} onChange={onSearchBoxChange} className="inputTag" type="search" placeholder="Search for GIF"/>
            </div>
            <hr />
            <div className="row" style={{ flexGrow: 1, overflowY: "scroll" }}>
                {
                    (searchResults && searchResults.length > 0) &&
                    searchResults.map((item, key) => {

                        return (
                            <div onClick={() => onSelect(item)} className="col" key={key}>
                                <img src={item["media"][0]["nanogif"]["url"]} />
                            </div>
                        )
                    })
                }
            </div>
        </div>
    )
}

export default GifSearchBar