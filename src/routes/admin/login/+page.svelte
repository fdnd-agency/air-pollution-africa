<script>
	/** @type {import('./$types').PageProps} */
	const { data, form } = $props()

	const pendingEmail = $derived(form?.email ?? data.pendingEmail ?? '')
	const error = $derived(form?.error ?? null)
	const step = $derived(form?.step ?? (pendingEmail ? 'verify' : 'request'))
	// Dev only: present when DEV_SHOW_LOGIN_CODE is enabled, never in production.
	const devCode = $derived(form?.devCode ?? null)
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

			{#if devCode}
				<div class="dev-code-warning" role="alert">
					<strong>⚠ Dev mode</strong> — your login code is <code>{devCode}</code>.
					<br />
					Shown only because <code>DEV_SHOW_LOGIN_CODE</code> is enabled. This must never be on in
					production.
				</div>
			{/if}

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

<style>
	main {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 20px;
	}

	.auth-page {
		width: 100%;
		max-width: 420px;
	}

	.auth-card {
		background-color: var(--DEF-White);
		color: var(--DEF-Black);
		border-radius: 16px;
		padding: 24px 28px;
		box-shadow: var(--DEF-Box-Shadow);
		border: 1px solid var(--DEF-Border);
	}

	.auth-title {
		color: var(--DEF-Blue-Tekst);
		font-size: 1.4rem;
		margin-bottom: 4px;
	}

	.auth-subtitle {
		font-size: 0.9rem;
		color: var(--DEF-Blue-Tekst);
		margin-bottom: 18px;
		text-align: center;
	}

	.auth-form {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.auth-form label {
		margin-bottom: 4px;
		display: block;
		font-weight: bold;
		color: var(--DEF-Blue-Tekst);
	}

	.auth-input {
		width: 100%;
		padding: 10px 12px;
		border-radius: 8px;
		border: 1px solid var(--DEF-Border);
		font-size: 0.95rem;
		outline: none;
		transition:
			border-color 0.2s ease,
			box-shadow 0.2s ease,
			background-color 0.2s ease;
	}

	.auth-input:focus {
		border-color: var(--DEF-Blue-Styling);
		box-shadow: 0 0 0 2px rgba(60, 126, 201, 0.2);
		background-color: var(--DEF-Background);
	}

	.auth-error {
		background-color: var(--DEF-Background);
		color: #b30000;
		border-radius: 8px;
		padding: 8px 10px;
		font-size: 0.85rem;
		margin-bottom: 10px;
	}

	.auth-button {
		margin-top: 6px;
		width: 100%;
		padding: 10px 14px;
		border-radius: 999px;
		border: none;
		cursor: pointer;
		background-color: var(--DEF-Blue-Styling);
		color: var(--DEF-White);
		font-weight: 600;
		font-size: 0.95rem;
		letter-spacing: 0.02em;
		transition:
			transform 0.1s ease,
			box-shadow 0.15s ease,
			opacity 0.15s ease;
	}

	.auth-button:hover {
		box-shadow: var(--DEF-Box-Shadow);
		transform: translateY(-1px);
	}

	.auth-button:active {
		transform: translateY(0);
		box-shadow: var(--DEF-shadow-soft);
		opacity: 0.9;
	}

	.auth-footer-text {
		margin-top: 14px;
		font-size: 0.8rem;
		color: var(--DEF-Grey-Tekst);
		text-align: center;
	}

	@media (max-width: 480px) {
		.auth-card {
			padding: 18px 16px;
			border-radius: 12px;
		}

		.auth-title {
			font-size: 1.2rem;
		}
	}

	.dev-code-warning {
		margin: 1rem 0;
		padding: 0.75rem 1rem;
		border: 1px solid #f0c36d;
		border-radius: 6px;
		background: #fff8e1;
		color: #6b4e00;
		font-size: 0.9rem;
		line-height: 1.4;
	}

	.dev-code-warning code {
		padding: 0.1rem 0.3rem;
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.06);
		font-weight: 700;
	}
</style>
