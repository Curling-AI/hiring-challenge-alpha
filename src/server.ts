import 'dotenv/config';
import buildApp from "./app"

const startServer = async () => {
    const app = await buildApp()

    try {
        await app.listen({
            port: Number(process.env.port) || 3000 ,
        })
    }catch(error){
        console.log(error)
        process.exit(1)
    }
}

startServer()