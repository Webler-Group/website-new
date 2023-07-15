//Dedicated page for Searching stuff in Webler website
//Not to be confused with SearchBar.tsx component, as this will import the component itself

import SearchBar from "../components/SearchBar";
import { Button } from "react-bootstrap";

function SearchPage() {
  return (
    <>
        <div>SearchPage</div>
        <SearchBar></SearchBar>
        <p>Enter your search field above</p>
        <Button>Search</Button>
    </> 
  )
}

export default SearchPage