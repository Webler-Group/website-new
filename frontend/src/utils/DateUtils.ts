const DateUtils = (function () {

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
        if (diff < 0) {
            result += "Today at"
        }
        else if (diff < 24 * 60 * 60 * 1000) {
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
        if (hours < 12) {
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

    const _formatUnits = (value: number, unit: string) => {
        return value + " " + (value > 1 ? unit + "s" : unit)
    }

    function format2(date: Date, showDate: boolean = false) {

        const currentDate = new Date()

        const diff = currentDate.getTime() - date.getTime();

        if (diff < 1000 * 60) {
            return "Just Now";
        }
        if (diff < 1000 * 60 * 60) {
            let val = Math.floor(diff / (1000 * 60)) % 60;
            return _formatUnits(val, "min")
        }
        if (diff < 1000 * 60 * 60 * 24) {
            let val = Math.floor(diff / (1000 * 60 * 60)) % 24;
            return _formatUnits(val, "hr")
        }
        if (!showDate) {
            if (diff < 1000 * 60 * 60 * 24 * 30) {
                let val = Math.floor(diff / (1000 * 60 * 60 * 24)) % 30;
                return _formatUnits(val, "day")
            }
            if (diff < 1000 * 60 * 60 * 24 * 30 * 12) {
                let val = Math.floor(diff / (1000 * 60 * 60 * 24 * 30)) % 12;
                return _formatUnits(val, "month")
            }
            return _formatUnits(Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24 * 365))), "year");
        }
        return (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear()
    }

    const formatDateForServer = (date: Date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const day = date.getDate().toString().padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    return {
        format,
        format2,
        formatDateForServer
    }

})()

export default DateUtils