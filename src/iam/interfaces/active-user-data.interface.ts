import { Role } from "src/users/enums/role.enums";

export interface ActiveUserData{
    sub:number;
    email:string;
    role:Role;
}