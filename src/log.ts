export class Log {
	public static devMode = true;

	public static d(msg: string) {
		if (Log.devMode) {
			console.debug("[DEBUG] wake-lock - " + msg);
		}
	}

	public static i(msg: string) {
		console.info("[INFO] wake-lock - " + msg);
	}

	public static e(msg: string) {
		console.error("[ERROR] wake-lock - " + msg);
	}
}
