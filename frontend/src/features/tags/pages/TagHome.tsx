import { useState } from "react";
import { BsHouse, BsSearch, BsPlusCircle, BsPerson } from "react-icons/bs";


function TagHome() {
    const [tagJobEntry, setTagJobEntry] = useState<string>("");
    const [tagJob, setTagJob] = useState<string[]>([]);

  const tags = new Array(50).fill("game-developer");
  const proposedTags = new Array(10).fill("software-engineering");

  const executeTagJob = () => {
        const entries = tagJobEntry.replace("\n", "").split(",").map(i => i.toLowerCase().trim());
        console.log(entries);
  }

  return (
    <div className="row p-2 m-2">
        <div className="col-8 border-end border-secondary">
            {
                tags.map((tagName, idx) => {
                    return(
                        <p key={idx} className="d-inline-block m-1 bg-secondary-subtle p-1 m-2 rounded text-secondary" 
                        style={{ cursor:"pointer" }}>
                            {tagName}
                        </p>
                    )
                })
            }
            <div>
                <button>Edit</button>
                                <button>Edit</button>
            </div>
        </div>
        <div className="col-4">
            <label htmlFor="tagsJob" className="form-label">Task Job</label>
            <textarea 
                rows={10}
                className="form-control m-1"
                value={tagJob}
                onChange={e => { setTagJobEntry(e.target.value) }}
                placeholder="Enter tags seperated by comma">
            </textarea>
            <div>
                <label htmlFor="createTagJob" className="form-label m-1">Create</label>
                <input id="createTagJob" type="radio" value="Create" />
                <label htmlFor="deleteTagJob" className="form-label m-1">Delete</label>
                <input id="deleteTagJob" type="radio" value="Delete" />
            </div>
            <button className="btn bg-success text-light w-100 m-1" onClick={executeTagJob}>Execute</button>
        </div>
    </div>
  );
}


export default TagHome;