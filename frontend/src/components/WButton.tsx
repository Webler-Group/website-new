interface IButtonProps {
    text: string,
    className?: string,
    onClick?: () => void
}


export const WTextButton = ({ text, className }: IButtonProps) => {
     return (
        <button className={`px-3 py-1 hover:text-gray-900 hover:cursor-pointer text-blue-900 rounded-lg ${className}`}>
            {text}
        </button>
    );
}

const WButton = ({ text, className, onClick }: IButtonProps) => {
    const handleClick = () => {
        if(typeof onClick == "function") onClick();
    }

    return (
        <button onClick={handleClick}
        className={`px-3 py-1 bg-blue-900 hover:bg-gray-900 hover:cursor-pointer text-white rounded-lg ${className}`}>
            {text}
        </button>
    );
}

export default WButton;