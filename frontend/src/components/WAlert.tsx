interface IWalertProps {
    variant: "danger" | "success" | "warning" | "info",
    message: string,
    title?: string,
};

const WAlert = ({ variant, message, title }: IWalertProps) => {
    let shade: string = "green";
    if(variant == "danger") shade = "red";
    else if(variant == "success") shade = "green";
    else if(variant == "warning") shade = "yellow";
    
    return (
        <div className={`bg-${shade}-100 border-${shade}-400 text-${shade}-700 border px-4 py-3 rounded relative`} 
        role="alert">
            {title && <strong className="font-bold">{title}</strong>}
            <span className="block sm:inline">{message}</span>
        </div>
    );
}

export default WAlert;