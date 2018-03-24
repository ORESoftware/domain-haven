import { HavenData } from "./domain-haven";
declare global  {
    namespace Express {
        interface Request {
            havenData: HavenData;
        }
    }
}
