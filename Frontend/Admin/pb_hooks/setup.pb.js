routerAdd("GET", "/api/gamez/setup-status", (e) => {
    let isSetupRequired = true;
    try {
        let firstUser = $app.findFirstRecordByFilter("users", "1=1");
        if (firstUser) {
            isSetupRequired = false;
        }
    } catch (err) {
        // No records found, so setup is required
        isSetupRequired = true;
    }
    return e.json(200, { isSetupRequired: isSetupRequired });
});

routerAdd("POST", "/api/gamez/setup-init", (e) => {
    let info = new DynamicModel({
        email: "",
        password: "",
        name: "",
        cafeName: ""
    });
    e.bindBody(info);

    let isSetupRequired = true;
    try {
        let firstUser = $app.findFirstRecordByFilter("users", "1=1");
        if (firstUser) {
            isSetupRequired = false;
        }
    } catch (err) {
        isSetupRequired = true;
    }

    if (!isSetupRequired) {
        return e.json(403, { message: "Setup has already been completed." });
    }

    try {
        let collection = $app.findCollectionByNameOrId("users");
        let record = new Record(collection);
        record.set("email", info.email);
        record.set("emailVisibility", true);
        record.set("verified", true);
        record.set("name", info.name);
        record.set("role", "admin");
        record.setPassword(info.password);
        
        $app.save(record);
        
        if (info.cafeName) {
            let propColl = $app.findCollectionByNameOrId("properties");
            let propRecord = new Record(propColl);
            propRecord.set("name", info.cafeName);
            propRecord.set("is_active", true);
            $app.save(propRecord);
        }

        return e.json(200, { success: true, message: "Admin account created successfully!" });
    } catch (err) {
        return e.json(400, { message: "Failed to create account.", error: err.message });
    }
});
