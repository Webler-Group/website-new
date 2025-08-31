import { WeblerBadge } from "./InputTags";

interface WAuthorProps {
    image?: string,
    name: string,
    role: string,
    content?: string
}

const Author = ({ image, name, role, content }: WAuthorProps) => {
    let _role = role.toLowerCase();
    const isValidRole = _role === "admin" || _role === "creator" || _role === "moderator";
    let color = _role === "admin"? "green": _role === "creator"? "yellow": 
        _role === "moderator"? "red": "black";

    return (
        <div className="flex items-center gap-3">
            {
                image && (
                <img
                    src={image}
                    alt={name}
                    className="w-8 h-8 rounded-xl object-cover" />
                )
            }

            {
                !image && (
                    <div className="w-8 h-8 rounded-xl bg-green-100 text-green-500 flex items-center">
                        <span>{name[0].toUpperCase()}</span>
                    </div>
                )
            }
            <div className='leading-tight'>
                <div className='flex items-center gap-2'>
                    <span className='font-medium text-gray-900 dark:text-gray-100'>{name}</span>
                    {
                        isValidRole && (
                        <WeblerBadge name={_role} className={` dark:bg-${color}-300 dark:text-${color}-900`} state="neutral" />
                        )
                    }
                </div>
            <p className="text-xs text-gray-500">{content}</p>
        </div>
    </div>       
    );
}


export default Author;