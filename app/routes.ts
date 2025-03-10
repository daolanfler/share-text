import { type RouteConfig, index, route } from "@react-router/dev/routes";


// we are not using file based routing so what ever the fuck

export default [
    index("routes/share.tsx"),
    route("/share/t/:id", "routes/shared-view.tsx"),
] satisfies RouteConfig;
