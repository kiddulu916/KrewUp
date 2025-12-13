import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

// Firebase Imports (Assumed available in the environment)  
import { initializeApp } from 'firebase/app';  
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';  
import { getFirestore, collection, query, onSnapshot, doc, setDoc, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';

// \--- CONFIGURATION AND UTILS \---

const appId \= typeof \_\_app\_id \!== 'undefined' ? \_\_app\_id : 'crewup-default';  
const firebaseConfig \= JSON.parse(typeof \_\_firebase\_config \!== 'undefined' ? \_\_firebase\_config : '{}');  
const initialAuthToken \= typeof \_\_initial\_auth\_token \!== 'undefined' ? \_\_initial\_auth\_token : null;

const AppContext \= createContext();

const TRADES \= \[  
  'Carpenter', 'Electrician', 'Plumber', 'HVAC Technician', 'Welder',  
  'Mason', 'Roofer', 'Painter', 'Heavy Equipment Operator', 'General Laborer'  
\];  
const TRADE\_SUBCATEGORIES \= {  
    'Carpenter': \[  
        'Rough Frame', 'Stacking', 'Finish', 'Drywall', 'Stairs',  
        'Insulation', 'Cabinetry', 'Woodworks', 'Decking'  
    \],  
    'Electrician': \[  
        'Residential Wiring', 'Commercial/Industrial', 'Low Voltage/Data',  
        'Fire Alarm/Security', 'Solar Installation'  
    \],  
    'Plumber': \[  
        'Residential Service', 'Commercial Construction', 'Pipefitting',  
        'HVAC/Boiler Systems', 'Drain Cleaning'  
    \],  
    'HVAC Technician': \[  
        'Residential AC/Heat Pump', 'Commercial Refrigeration',  
        'Boiler/Hydronic Systems', 'Duct Installation', 'Sheet Metal Fabrication'  
    \],  
    'Welder': \[  
        'Pipe Welding (TIG/MIG)', 'Structural Steel', 'Fabrication (Shop)',  
        'Underwater Welding', 'Flux-Cored Arc Welding (FCAW)'  
    \],  
    'Mason': \[  
        'Bricklaying', 'Blocklaying', 'Stonework', 'Tuckpointing/Restoration',  
        'Concrete Finishing'  
    \],  
    'Roofer': \[  
        'Shingle Installation', 'Flat Roofing (TPO/EPDM)', 'Metal Roofing',  
        'Repair/Maintenance'  
    \],  
    'Painter': \[  
        'Residential Interior', 'Commercial Exterior', 'Industrial Coating',  
        'Drywall Finishing/Texture'  
    \],  
    'Heavy Equipment Operator': \[  
        'Excavator', 'Bulldozer/Grader', 'Crane Operator',  
        'Forklift/Telehandler', 'Skid Steer'  
    \],  
    'General Laborer': \[  
        'Site Clean-up', 'Tool/Supply Management', 'Demolition',  
        'Material Handling', 'Flagging/Spotting'  
    \]  
};  
const ROLES \= \['Worker', 'Employer'\];  
const EMPLOYER\_TYPES \= \['Contractor', 'Recruiter'\];  
const SUBSCRIPTION\_LEVELS \= \['Free', 'Pro'\];  
const CERTIFICATIONS \= \['OSHA 10', 'OSHA 30', 'First Aid/CPR', 'Forklift Operator', 'Journeyman License', 'Master Plumber'\];

// Pricing Constants  
const PRO\_MONTHLY \= 15;  
const PRO\_ANNUAL \= 150;

// \--- GEOSPATIAL UTILS \---  
const haversineDistance \= (loc1, loc2) \=\> {  
    if (\!loc1 || \!loc2) return Infinity;  
    const R \= 6371; // Radius of Earth in kilometers  
    const toRad \= (angle) \=\> angle \* (Math.PI / 180);  
    const dLat \= toRad(loc2.lat \- loc1.lat);  
    const dLon \= toRad(loc2.lng \- loc1.lng);  
    const lat1 \= toRad(loc1.lat);  
    const lat2 \= toRad(loc2.lat);  
    const a \= Math.sin(dLat / 2\) \* Math.sin(dLat / 2\) \+  
              Math.sin(dLon / 2\) \* Math.sin(dLon / 2\) \* Math.cos(lat1) \* Math.cos(lat2);  
    const c \= 2 \* Math.atan2(Math.sqrt(a), Math.sqrt(1 \- a));  
    return R \* c;  
};

// \--- FIREBASE AND AUTHENTICATION HOOKS \---  
const getPublicCollectionPath \= (collectionName) \=\>  
  \`/artifacts/${appId}/public/data/${collectionName}\`;

const useFirebase \= () \=\> {  
    const \[db, setDb\] \= useState(null);  
    const \[auth, setAuth\] \= useState(null);  
    const \[userId, setUserId\] \= useState(null);  
    const \[isAuthReady, setIsAuthReady\] \= useState(false);

    useEffect(() \=\> {  
        if (Object.keys(firebaseConfig).length \=== 0\) return;  
        try {  
            const app \= initializeApp(firebaseConfig);  
            const firestoreDb \= getFirestore(app);  
            const firebaseAuth \= getAuth(app);  
            setDb(firestoreDb);  
            setAuth(firebaseAuth);

            const authenticate \= async () \=\> {  
                // If token is present, use custom auth. Otherwise, try anonymous for read access.  
                if (initialAuthToken) {  
                    await signInWithCustomToken(firebaseAuth, initialAuthToken);  
                } else {  
                    await signInAnonymously(firebaseAuth);  
                }  
            };  
            authenticate();

            const unsubscribe \= onAuthStateChanged(firebaseAuth, (user) \=\> {  
                setUserId(user ? user.uid : null);  
                setIsAuthReady(true);  
            });

            return () \=\> unsubscribe();  
        } catch (error) {  
            console.error("Firebase initialization failed:", error);  
        }  
    }, \[\]);

    const signInWithGoogle \= useCallback(async () \=\> {  
        if (\!auth) return;  
        try {  
            const provider \= new GoogleAuthProvider();  
            await signInWithPopup(auth, provider);  
        } catch (error) {  
            console.error("Google Sign-in failed:", error);  
        }  
    }, \[auth\]);

    const handleSignOut \= useCallback(async () \=\> {  
        if (\!auth) return;  
        try {  
            await signOut(auth);  
        } catch (error) {  
            console.error("Sign out failed:", error);  
        }  
    }, \[auth\]);

    return { db, auth, userId, isAuthReady, signInWithGoogle, handleSignOut };  
};

// \--- CUSTOM HOOKS FOR DATA MANAGEMENT \---

const useProfiles \= (db, userId, isAuthReady) \=\> {  
    const \[profiles, setProfiles\] \= useState(\[\]);  
    const \[myProfile, setMyProfile\] \= useState(null);  
    const \[userCoords, setUserCoords\] \= useState(null);

    const getDefaultProfile \= useCallback((currentUserId, displayName \= null) \=\> ({  
        userId: currentUserId,  
        // Name starts with 'User-' if anonymous, used to trigger onboarding  
        name: displayName || \`User-${currentUserId?.substring(0, 8\) || 'Anon'}\`,   
        role: 'Worker',  
        subscriptionStatus: 'Free',  
        employerType: null,  
        trade: 'General Laborer',  
        subTrade: null,  
        location: 'No location set (Click Edit)',  
        bio: 'Ready to work hard and learn new skills on site\!',  
        certifications: \[\],  
        experience: \[\],  
        coords: null,  
    }), \[\]);

    const fetchUserLocation \= useCallback(() \=\> {  
        // Location read from device biometrics (GPS/Wi-Fi)  
        if (navigator.geolocation) {  
            navigator.geolocation.getCurrentPosition(  
                (position) \=\> {  
                    const { latitude, longitude } \= position.coords;  
                    setUserCoords({ lat: latitude, lng: longitude });  
                },  
                (error) \=\> {  
                    // Fallback location if denied/failed  
                    setUserCoords({ lat: 41.8781, lng: \-87.6298 });  
                },  
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }  
            );  
        } else {  
            setUserCoords({ lat: 41.8781, lng: \-87.6298 });  
        }  
    }, \[\]);

    useEffect(() \=\> {  
        fetchUserLocation();  
    }, \[fetchUserLocation\]);

    useEffect(() \=\> {  
        if (\!db || \!isAuthReady) return;

        const profilesPath \= getPublicCollectionPath('profiles');  
        const profilesQuery \= collection(db, profilesPath);

        const unsubscribe \= onSnapshot(profilesQuery, (snapshot) \=\> {  
            const fetchedProfiles \= snapshot.docs.map(doc \=\> ({  
                id: doc.id,  
                ...doc.data()  
            }));

            setProfiles(fetchedProfiles);  
            const userProfile \= fetchedProfiles.find(p \=\> p.userId \=== userId);  
              
            // If user is signed in with Google but profile doesn't exist, create one using display name  
            if (\!userProfile && userId && userId \!== 'Anon') {  
                const auth \= getAuth();  
                const displayName \= auth.currentUser?.displayName;  
                setMyProfile(getDefaultProfile(userId, displayName));  
            } else {  
                setMyProfile(userProfile || getDefaultProfile(userId));  
            }

        }, (error) \=\> {  
            console.error("Error fetching profiles:", error);  
        });

        return () \=\> unsubscribe();  
    }, \[db, isAuthReady, userId, getDefaultProfile\]);

    const updateProfile \= useCallback(async (profileData) \=\> {  
        if (\!db || \!userId) return;  
        const profileRef \= doc(db, getPublicCollectionPath('profiles'), userId);  
        try {  
            await setDoc(profileRef, {  
                ...profileData,  
                userId: userId,  
                updatedAt: serverTimestamp()  
            }, { merge: true });  
            setMyProfile(profileData);  
        } catch (e) {  
            console.error("Error updating profile: ", e);  
        }  
    }, \[db, userId\]);

    return { profiles, myProfile, updateProfile, userCoords, fetchUserLocation };  
};

const useJobs \= (db, isAuthReady) \=\> {  
    const \[jobs, setJobs\] \= useState(\[\]);  
    const \[isLoadingJobs, setIsLoadingJobs\] \= useState(true);

    useEffect(() \=\> {  
        if (\!db || \!isAuthReady) return;

        const jobsPath \= getPublicCollectionPath('jobs');  
        const jobsQuery \= query(collection(db, jobsPath), orderBy('createdAt', 'desc'));

        const unsubscribe \= onSnapshot(jobsQuery, (snapshot) \=\> {  
            const fetchedJobs \= snapshot.docs.map(doc \=\> ({  
                id: doc.id,  
                ...doc.data(),  
                createdAt: doc.data().createdAt?.toDate()  
            }));  
            setJobs(fetchedJobs);  
            setIsLoadingJobs(false);  
        }, (error) \=\> {  
            console.error("Error fetching jobs:", error);  
            setIsLoadingJobs(false);  
        });

        return () \=\> unsubscribe();  
    }, \[db, isAuthReady\]);

    const postJob \= useCallback(async (jobData) \=\> {  
        if (\!db) return;  
        try {  
            await addDoc(collection(db, getPublicCollectionPath('jobs')), {  
                ...jobData,  
                createdAt: serverTimestamp(),  
            });  
        } catch (e) {  
            console.error("Error posting job: ", e);  
        }  
    }, \[db\]);

    return { jobs, isLoadingJobs, postJob };  
};

// \--- UI COMPONENTS & CONTEXT PROVIDER \---

const LoadingSpinner \= () \=\> (  
    \<div className="flex justify-center items-center h-full py-10"\>  
        \<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-crewup-blue"\>\</div\>  
        \<span className="ml-3 text-gray-600"\>Loading CrewUp...\</span\>  
    \</div\>  
);

const AuthButton \= () \=\> {  
    const { auth, signInWithGoogle, handleSignOut, myProfile } \= useContext(AppContext);  
    const user \= auth?.currentUser;  
    const isLoggedIn \= user && \!user.isAnonymous;

    if (\!isLoggedIn) {  
        return (  
            \<button   
                onClick={signInWithGoogle}   
                className="bg-white text-crewup-blue px-3 py-1 rounded-full text-sm font-semibold shadow-md hover:bg-gray-100 transition-colors"  
            \>  
                🔑 Sign In with Google  
            \</button\>  
        );  
    }

    return (  
        \<div className="flex items-center space-x-2"\>  
            \<span className="text-white text-sm truncate max-w-\[80px\]"\>Hello, {myProfile?.name.split(' ')\[0\] || 'User'}\</span\>  
            \<button   
                onClick={handleSignOut}   
                className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold hover:bg-red-600 transition-colors"  
            \>  
                Sign Out  
            \</button\>  
        \</div\>  
    );  
}

// \--- ONBOARDING IMPLEMENTATION \---

const OnboardingForm \= () \=\> {  
    const { myProfile, updateProfile } \= useContext(AppContext);  
    const defaultName \= myProfile?.name;  
    const \[name, setName\] \= useState(defaultName && \!defaultName.startsWith('User-') ? defaultName : '');  
    const \[role, setRole\] \= useState('Worker');  
    const \[employerType, setEmployerType\] \= useState('Contractor');

    const handleOnboardingSubmit \= async (e) \=\> {  
        e.preventDefault();  
        if (\!name.trim()) return;

        const profileData \= {  
            ...myProfile,  
            name: name.trim(),  
            role: role,  
            employerType: role \=== 'Employer' ? employerType : null,  
            trade: 'General Laborer', // Set default trade  
            subTrade: null,  
            location: 'Update your location in Profile',  
        };

        await updateProfile(profileData);  
    };

    return (  
        \<div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50"\>  
            \<div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full"\>  
                \<h2 className="text-2xl font-extrabold text-crewup-blue mb-4"\>Welcome to CrewUp\!\</h2\>  
                \<p className="text-gray-600 mb-6"\>Let's set up your core identity to get started.\</p\>  
                \<form onSubmit={handleOnboardingSubmit} className="space-y-4"\>  
                    \<InputField   
                        label="Your Full Name"   
                        value={name}   
                        onChange={(e) \=\> setName(e.target.value)}   
                        placeholder={defaultName}  
                        required   
                    /\>  
                    \<SelectField   
                        label="Account Type (Role)"   
                        value={role}   
                        onChange={(e) \=\> {  
                            setRole(e.target.value);  
                            setEmployerType(EMPLOYER\_TYPES\[0\]); // Reset employer type if role changes  
                        }}   
                        options={ROLES}   
                        required   
                    /\>  
                    {role \=== 'Employer' && (  
                        \<SelectField   
                            label="Official Label"   
                            value={employerType}   
                            onChange={(e) \=\> setEmployerType(e.target.value)}   
                            options={EMPLOYER\_TYPES}   
                            required   
                        /\>  
                    )}  
                      
                    \<button  
                        type="submit"  
                        className="w-full bg-crewup-orange text-white py-3 rounded-lg font-bold hover:bg-crewup-blue transition-colors shadow-lg"  
                        disabled={\!name.trim()}  
                    \>  
                        Create My CrewUp Account  
                    \</button\>  
                \</form\>  
            \</div\>  
        \</div\>  
    );  
}

const AppProvider \= ({ children }) \=\> {  
    const { db, auth, userId, isAuthReady, signInWithGoogle, handleSignOut } \= useFirebase();  
    const { profiles, myProfile, updateProfile, userCoords, fetchUserLocation } \= useProfiles(db, userId, isAuthReady);  
    const { jobs, isLoadingJobs, postJob } \= useJobs(db, isAuthReady);

    const \[currentView, setCurrentView\] \= useState('Feed');  
    const \[messageRecipient, setMessageRecipient\] \= useState(null);

    if (\!isAuthReady || \!myProfile) {  
        return \<LoadingSpinner /\>;  
    }  
      
    // Check if onboarding is needed: if profile name starts with 'User-'  
    const requiresOnboarding \= myProfile.name && myProfile.name.startsWith('User-');

    const contextValue \= {  
        db, auth, userId,  
        profiles, myProfile, updateProfile, userCoords, fetchUserLocation,  
        jobs, isLoadingJobs, postJob,  
        currentView, setCurrentView,  
        messageRecipient, setMessageRecipient,  
        signInWithGoogle, handleSignOut,  
    };

    return (  
        \<AppContext.Provider value={contextValue}\>  
            {requiresOnboarding ? \<OnboardingForm /\> : children}  
        \</AppContext.Provider\>  
    );  
}

const Header \= () \=\> {  
    const { setCurrentView, currentView, myProfile } \= useContext(AppContext);  
    const role \= myProfile?.role;  
    const isEmployer \= role \=== 'Employer';

    const tabs \= \[  
        { name: 'Feed', icon: '🛠️', label: 'Jobs' },  
        { name: 'Profile', icon: '👷', label: 'Profile' },  
        { name: 'Messages', icon: '💬', label: 'Messages' },  
    \];

    if (isEmployer) {  
         tabs.push({ name: 'PostJob', icon: '💰', label: 'Post Job' });  
    }

    return (  
        \<header className="bg-crewup-blue p-3 shadow-lg fixed top-0 left-0 right-0 z-10"\>  
            \<div className="max-w-xl mx-auto flex justify-between items-center"\>  
                \<h1 className="text-xl font-extrabold text-white tracking-wider"\>CrewUp\</h1\>  
                \<AuthButton /\>  
            \</div\>  
            \<div className="max-w-xl mx-auto flex justify-center items-center mt-2"\>  
                \<div className="flex space-x-2 bg-white/10 p-1 rounded-full"\>  
                    {tabs.map((tab) \=\> (  
                        \<button  
                            key={tab.name}  
                            onClick={() \=\> setCurrentView(tab.name)}  
                            className={\`px-3 py-1 text-sm font-semibold rounded-full transition-all duration-200 ${  
                                currentView \=== tab.name  
                                ? 'bg-crewup-orange text-white shadow-md'  
                                : 'text-white hover:bg-white/20'  
                            }\`}  
                            aria-label={tab.name}  
                        \>  
                            {tab.icon} {tab.label}  
                        \</button\>  
                    ))}  
                \</div\>  
            \</div\>  
        \</header\>  
    );  
};

const MessagesPlaceholder \= () \=\> {  
    const { messageRecipient, setMessageRecipient } \= useContext(AppContext);

    useEffect(() \=\> {  
        return () \=\> { setMessageRecipient(null); };  
    }, \[setMessageRecipient\]);

    return (  
        \<div className="p-8 bg-white shadow-lg rounded-xl max-w-xl mx-auto m-4 text-center"\>  
            \<h2 className="text-2xl font-bold text-crewup-blue mb-4"\>💬 Direct Messaging (FREE)\</h2\>  
              
            {messageRecipient ? (  
                \<div className="bg-blue-100 p-4 rounded-md mt-4 border border-crewup-blue"\>  
                    \<p className="font-semibold text-crewup-blue"\>  
                        Current Thread: Messaging {messageRecipient.name} ({messageRecipient.id.substring(0, 8)}...)  
                    \</p\>  
                    \<p className="text-sm text-gray-700 mt-2"\>  
                        \*In a real app, this would load the chat history and input box.\*  
                    \</p\>  
                    \<button   
                        onClick={() \=\> setMessageRecipient(null)}   
                        className="text-xs text-red-500 hover:underline mt-2 p-1 rounded"  
                    \>  
                        \&times; Close Thread  
                    \</button\>  
                \</div\>  
            ) : (  
                \<p className="text-gray-700"\>  
                    Select an employer from the Jobs feed to start a new conversation. This feature is free for all users.  
                \</p\>  
            )}  
        \</div\>  
    );  
}

const JobPostingForm \= () \=\> {  
    const { postJob, userId, myProfile, setCurrentView, userCoords } \= useContext(AppContext);  
    const \[formData, setFormData\] \= useState({  
        title: '', trade: '', subTrade: null, jobType: 'Hired', location: '', description: '', payRate: '', requiredCerts: \[\]  
    });  
    const \[showStatus, setShowStatus\] \= useState(false);

    if (myProfile?.role \!== 'Employer') {  
        return (  
            \<div className="p-8 bg-white shadow-lg rounded-xl max-w-xl mx-auto m-4"\>  
                \<h2 className="text-2xl font-bold text-red-600 mb-4"\>Employer Feature\</h2\>  
                \<p className="text-lg text-gray-700"\>You must set your account role to \*\*Employer\*\* to post jobs.\</p\>  
                \<button onClick={() \=\> setCurrentView('Profile')} className="mt-6 w-full bg-crewup-orange text-white py-3 rounded-lg font-bold hover:bg-crewup-blue transition-colors"\>  
               