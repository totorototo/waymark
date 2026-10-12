import { create } from "zustand";

// A new build of waymark, installed and waiting: `apply` takes it (and reloads the page), or
// is null while there is none. Apart from the editor's store, as it outlives every file.
const useAppUpdate = create(() => ({ apply: null }));

// main.jsx calls it when the service worker reports a waiting build.
export const offerUpdate = (apply) => useAppUpdate.setState({ apply });

export default useAppUpdate;
