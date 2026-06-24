(async () => {
   const res = await fetch('http://127.0.0.1:8090/api/collections/website_content/records');
   const data = await res.json();
   console.log(JSON.stringify(data.items[0], null, 2));
})();
