import { useRef, useEffect } from 'react';

function PageTitle(title:string, prevailOnUnmount = false) {
    const defaultTitle = useRef(document.title);

    useEffect(() => {
        document.title = title;
    }, [title]);

    useEffect(() => () => {
        if (!prevailOnUnmount) {
        document.title = defaultTitle.current;
        }
    }, [])
}

export default PageTitle;