
import { mutationGeneric, queryGeneric } from "convex/server";
import { DataModel } from "./_generated/dataModel";

export const mutation = mutationGeneric<DataModel>;
export const query = queryGeneric<DataModel>;
