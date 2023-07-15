const DateUtils = (function() {

    function format(date: Date) {
        const year = date.getFullYear()
        const month = date.getMonth()
        const day = date.getDate()
        const hours = date.getHours()
        const minutes = date.getMinutes()

        const currentDate = new Date()
        const todayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 0, 0, 0, 0)

        let result = ""

        const diff = todayDate.getTime() - date.getTime()
        if(diff < 0) {
            result += "Today at"
        }
        else if(diff < 24 * 60 * 60 * 1000) {
            result += "Yesterday at"
        }
        else {
            result += "0" + (month + 1 < 10 ? (month + 1) : (month + 1)) + 
                "/" + 
                (day < 10 ? "0" + day : day) + 
                "/" + 
                year
        }
        result += " "
        if(hours < 12) {
            result += (hours == 0 ? 12 : hours).toString() +
            ":" +
            (minutes < 10 ? "0" + minutes : minutes).toString() +
            " AM"
        }
        else {
            result += (hours - 12 == 0 ? 12 : hours - 12).toString() +
            ":" +
            (minutes < 10 ? "0" + minutes : minutes).toString() +
            " PM"
        }

        return result
    }

    return {
        format
    }

})()

export default DateUtils