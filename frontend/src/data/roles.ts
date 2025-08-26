export const adminRole = ["Admin"];

export const adminAndModRole = ["Admin", "Moderator"];

export const isAuthenticatedRole = (roles: string[] | undefined) => 
    roles && roles.some(role => role == "User");

export const isAdminRole = (roles: string[] | undefined) => 
    roles && roles.some(role => role == "Admin");


export const isAdminOrModRole = (roles: string[] | undefined) => 
    roles && roles.some(role => adminAndModRole.includes(role));


export const isCreatorRole = (roles: string[] | undefined) => 
    roles && roles.some(role => ["Admin", "Creator"].includes(role));

const roles: string[] = [ 
    "Creator",
    "Moderator",
    "Admin",
    "User"
 ];

export default roles;