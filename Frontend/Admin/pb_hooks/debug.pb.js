routerAdd("GET", "/api/debug-app", (e) => {
    return e.json(200, { keys: Object.keys($app) });
});
