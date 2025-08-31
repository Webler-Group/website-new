import { Search } from "lucide-react";
import { useState } from "react";

interface WInputProps {
    type?: string,
    value?: string,
    placeholder?: string,
    onChange?: (e: any) => void,
    minLength?: number,
    maxLength?: number,
    className?: string,
}

interface WPasswordFieldProps extends WInputProps {
    showVisibility?: boolean
}


const WTextField = ({ type, value, minLength, maxLength, onChange, placeholder }: WInputProps) => {
    return (
        <input type={type} 
        minLength={minLength} 
        maxLength={maxLength} 
        required 
        value={value} 
        onChange={e => { if(typeof onChange === "function") onChange(e) }} 
        placeholder={placeholder} 
        className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500" 
        />
    );
}


const WEmailField = ({ placeholder, onChange }: WInputProps) => {
    return (
        <input type="email" 
        required 
        onChange={e => { if(typeof onChange === "function") onChange(e) }} 
        placeholder={placeholder} 
        className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500" 
        />
    );
}


const WPasswordField = ({ placeholder, value, onChange, showVisibility }: WPasswordFieldProps) => {
    const [type, setType] = useState<string>("password");

    return (
        <div className="relative w-full">
            <input type={type} 
                value={value} 
                onChange={e => { if(typeof onChange === "function") onChange(e) }} 
                placeholder={placeholder} 
                className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500" 
            />
            {
                showVisibility && (
                <button type="button" id="togglePassword" 
                    onClick={() => { setType(type === "text" ? "password": "text") } }
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700">
                    {
                        (type === "password") && (
                        <svg id="eyeOpen" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" 
                        stroke-width="2" stroke="currentColor" className="w-6 h-6">
                            <path stroke-linecap="round" stroke-linejoin="round" 
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 
                                2.943 9.542 7-1.274 4.057-5.065 7-9.542 
                                7-4.477 0-8.268-2.943-9.542-7z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                        )
                    }

                    {
                        (type === "text") && (
                        <svg id="eyeClosed" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" 
                        stroke-width="2" stroke="currentColor" className="w-6 h-6">
                            <path stroke-linecap="round" stroke-linejoin="round" 
                                d="M3 3l18 18M9.88 9.88A3 3 0 0112 9c1.657 0 
                                3 1.343 3 3 0 .39-.074.76-.207 
                                1.098M6.23 6.23C4.31 7.67 2.9 
                                9.68 2.458 12c1.274 4.057 5.065 
                                7 9.542 7 1.68 0 3.26-.41 
                                4.65-1.14M17.77 17.77C19.69 
                                16.33 21.1 14.32 21.542 12a10.477 
                                10.477 0 00-4.648-6.86" />
                        </svg>
                        )
                    }
                </button>
                )
            }
        </div>
    );
}


const WSearchField = ({ value, placeholder, onChange }: WInputProps) => {
    return(
        <div className="flex items-center w-full sm:w-2/3 border rounded-lg px-3 py-2 bg-white dark:bg-gray-800">
            <Search className="w-5 h-5 text-gray-400" />
            <input
            type="text"
            placeholder={placeholder}
            className="ml-2 flex-1 bg-transparent outline-none text-gray-700 dark:text-gray-200"
            value={value}
            onChange={e => { if(typeof onChange === "function") onChange(e) }} 
            />
        </div>
    )
}


export {
    WTextField,
    WPasswordField,
    WEmailField,
    WSearchField
}