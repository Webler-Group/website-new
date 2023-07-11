let sample

export default class SampleDAO{
    static async injectDB(conn){
        if(sample){
            return
        }
        try{
            sample = await conn.db(process.env.DATABASE_NS).collection("sample")
        }catch(e){
            console.error(
                `Unable to establish a collection handle in sampleDAO: ${e}`,
            )
        }
    }


    static async getSample({
        filters = null,
        page = 0,
        samplePerPage = 20,
    } = {}){
        let query
        if ("name" in filters){
            query
        }
    }


}