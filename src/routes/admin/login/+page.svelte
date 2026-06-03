<script>
	/** @type {import('./$types').PageProps} */
	const { data, form } = $props()

	const pendingEmail = $derived(form?.email ?? data.pendingEmail ?? '')
	const error = $derived(form?.error ?? null)
	const step = $derived(form?.step ?? (pendingEmail ? 'verify' : 'request'))
</script>

<main>
	<h1 class="auth-title">Login</h1>
	<p class="auth-subtitle">Enter your email to receive a one-time login code.</p>
	<div class="auth-page">
		<div class="auth-card">
			{#if error}
				<p class="auth-error">{error}</p>
			{/if}

			<form
				method="POST"
				action="?/request"
				class="auth-form"
			>
				<div>
					<label for="email">Email address</label>
					<input
						id="email"
						name="email"
						type="email"
						class="auth-input"
						placeholder="name@example.com"
						value={pendingEmail}
						required
					/>
				</div>
				<button
					type="submit"
					class="auth-button">Send code</button
				>
			</form>

			{#if step === 'verify'}
				<form
					method="POST"
					action="?/verify"
					class="auth-form"
				>
					<input
						type="hidden"
						name="email"
						value={pendingEmail}
					/>
					<div>
						<label for="code">Login code</label>
						<input
							id="code"
							name="code"
							type="text"
							class="auth-input"
							required
						/>
					</div>
					<button
						type="submit"
						class="auth-button">Verify & sign in</button
					>
				</form>
			{/if}

			<p class="auth-footer-text">You'll receive a 6-digit code by email within a few seconds</p>
		</div>
	</div>
</main>
