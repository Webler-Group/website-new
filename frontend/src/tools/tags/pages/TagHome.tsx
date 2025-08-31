import { useState } from "react";
import { FaTag, FaTrash } from "react-icons/fa";
import { useApi } from "../../../context/apiCommunication";
import PageTitle from "../../../layouts/PageTitle";


function TagHome() {
    const [tagJobEntry, setTagJobEntry] = useState<string>("");
    const [loadingText, setLoadingText] = useState<string>("");

    const { sendJsonRequest } = useApi();

    PageTitle("Tag Executor");

    const getJobEntry = () => tagJobEntry.replace("\n", "")
        .split(",")
        .map(i => i.toLowerCase().trim())
        .filter(i => i != "");

    const executeTagJob = async(e: any, action: string) => {
            e.preventDefault();
            setLoadingText("Running...");
            const tags = getJobEntry();
            const result = await sendJsonRequest(`/Tag/ExecuteJobs`, "POST", {
                tags,
                action
            });

            setTagJobEntry("");

            if(result && result.message) {
                setLoadingText(result.message);
                return;
            }
            setLoadingText("");
    }

  return (
    <div className="container-fluid p-2 d-flex align-items-center justify-content-center">
        <div className="col-12 col-lg-4 p-2">
            <label htmlFor="tagsJob" className="form-label fw-bold">Execute Tag Jobs</label>
            <textarea 
                rows={10}
                className="form-control m-1 border-secondary"
                value={tagJobEntry}
                onChange={e => { setTagJobEntry(e.target.value) }}
                placeholder="Enter tags seperated by comma... games,html,css,">
            </textarea>
            <p className="">{ loadingText }</p>
            <div className="row">
                <button className="col btn bg-success text-light w-100 m-1" 
                    onClick={e => executeTagJob(e, "create")}>
                    <FaTag className="m-1" />
                    Create
                </button>
                <button className="col btn bg-danger text-light w-100 m-1" 
                    onClick={e => executeTagJob(e, "delete")}>
                        <FaTrash className="m-1" />
                        Delete
                </button>
            </div>
        </div>
    </div>
  );
}


export default TagHome;
