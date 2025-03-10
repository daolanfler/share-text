import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/share.tsx"),
    route("/share/t/:id", "routes/share.t.$id.tsx"),
] satisfies RouteConfig;
