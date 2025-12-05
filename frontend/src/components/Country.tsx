import countries from "../data/countries"

interface CountryProps {
    country: typeof countries[0]
}

const Country = ({ country }: CountryProps) => {
    return (
        <>
            <img width={20} height={20} src={country.image} />
            <span className="m-1">{country.name}</span>
        </>
    )
}

export default Country;