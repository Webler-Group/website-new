import { useState } from "react"

const useTab = (isOpen: boolean) => {


    const [tabOpen, setTabOpen] = useState(isOpen);

    const onTabEnter = () => {
        setTabOpen(true);
    }

    const onTabLeave = () => {
        setTabOpen(false);
    }

    return { tabOpen, onTabEnter, onTabLeave };
}

export default useTab