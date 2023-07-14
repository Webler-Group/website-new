import PageTitle from "../partials/PageTitle";

function Products() {
  PageTitle("Products | Webler")    
  return (
    <>
        {/* Main */}
            <main>
                <div className="pageNameBannerTop">
                    <h1>Products</h1>
                </div>
                <hr />
                <p>The products manufactured by Webler Company will be listed here. These may include other goods and servces.</p>
                <p>Not to be confused with Codes in Code Playground</p>
            </main>
        </>
  )
}

export default Products