import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    GoogleAuthProvider,
    sendPasswordResetEmail,
    signInWithPopup,
    updatePassword,
    reauthenticateWithPopup,
    reauthenticateWithCredential,
    EmailAuthProvider
} from "firebase/auth";
import React, { useContext, useEffect, useState } from "react";
import { auth, } from "../../services/firebase.config";
import User from "../member/User";
import DatabaseClient from "../../api/DatabaseClient";

const googleProvider = new GoogleAuthProvider();
const AuthContext = React.createContext<any>({});

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: any) {

    const [currentUser, setCurrentUser] = useState<any>();

    async function signup(email: string, username: string, password: string) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        await createUserIfNotExists(userCredential.user.uid, username)
            .then(snapshot => {
                let user = snapshot.val() as User
                setUserDetails(user)
            });
    }

    async function signin(email: string, password: string) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await DatabaseClient.getUser(userCredential.user.uid)
            .then(snapshot => {
                let user = snapshot.val() as User
                setUserDetails(user)
            })
    }

    async function signWithGoogle() {
        const userCredential = await signInWithPopup(auth, googleProvider);
        await createUserIfNotExists(userCredential.user.uid, null)
            .then(snapshot => {
                let user = snapshot.val() as User
                setUserDetails(user)
            })
    }

    async function signout() {
        await signOut(auth);
        setUserDetails(null)
    }

    function resetPassword(email: string) {
        return sendPasswordResetEmail(auth, email)
    }

    function changePassword(password: string) {
        return updatePassword(currentUser, password)
    }

    function reauthWithGoogle() {
        return reauthenticateWithPopup(currentUser, googleProvider)
    }

    function reauthWithCredential(password: string) {
        const credential = EmailAuthProvider.credential(currentUser.email, password);
        return reauthenticateWithCredential(currentUser, credential);
    }

    async function createUserIfNotExists(uid: string, username: string | null) {
        let snapshot = await DatabaseClient.getUser(uid)
        if (!snapshot.exists()) {
            if (username == null) {
                username = "User" + Date.now().toString() + Math.floor(Math.random() * 10).toString();
            }
            const user = new User(uid, username);
            await DatabaseClient.createUser(user);

            snapshot = await DatabaseClient.getUser(uid);
        }
        return snapshot
    }

    function getUserDetails() {
        let item = localStorage.getItem("user");
        const user = item ? JSON.parse(item) : null;
        if(user && typeof user == "object" && user.hasOwnProperty("uid")) {
            return user
        }
        return null
    }

    function setUserDetails(user: User | null) {
        if (user) {
            localStorage.setItem("user", JSON.stringify(user));
        }
        else {
            localStorage.removeItem("user")
        }
    }

    function updateUserDetails(data: any) {
        const user = getUserDetails()
        for (let attr in data) {
            user[attr] = data[attr]
        }
        setUserDetails(user)
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            if (!user) {
                setUserDetails(null)
            }
        })
        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        signup,
        signin,
        signWithGoogle,
        signout,
        resetPassword,
        changePassword,
        reauthWithGoogle,
        reauthWithCredential,
        getUserDetails,
        setUserDetails,
        updateUserDetails
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}