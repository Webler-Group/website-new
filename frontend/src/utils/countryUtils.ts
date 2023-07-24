import countries from "../config/countries"

const CountryUtils = (() => {

    const getCountryString = (country: typeof countries[0]) => {
        return country.emoji + " " + country.name;
    }

    return {
        getCountryString
    }

})()

export default CountryUtils;