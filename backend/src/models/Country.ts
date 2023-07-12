import mongoose from "mongoose";

const countrySchema = new mongoose.Schema({
    code: {
        required: true,
        type: String
    }
},
{
    timestamps: true
});

const Country = mongoose.model('Country', countrySchema);

export default Country;