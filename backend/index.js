export default {
    async fetch(request, env, ctx) {
        return new Response(JSON.stringify({ message: "Hello!" }), {
            headers: { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
        });
    },
};
