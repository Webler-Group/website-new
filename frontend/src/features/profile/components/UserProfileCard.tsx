export interface UserProfileCardProps {
	avatarUrl: string;
	name: string;
	bio: string;
	xp: number;
	level: number;
	followers: number;
	following: number;
}

function xpForLevel(level: number): number {
  	return Math.floor(50 * level * level * 0.8);
}

function getXpToNextLevel(currentXp: number, level: number) {
	const nextLevelXp = xpForLevel(level + 1);
	return Math.max(0, nextLevelXp - currentXp);
}

function getPercentageToLevel30(level: number) {
  	return Math.min(100, Math.floor((level / 30) * 100));
}

const UserProfileCard = ({ avatarUrl, name, bio, xp, level, followers, following }: UserProfileCardProps) => {

	const progressTo30 = getPercentageToLevel30(level);
	const xpNeeded = getXpToNextLevel(xp, level);

	return (
		<div className="card shadow-sm p-3 rounded-4" style={{ maxWidth: "420px" }}>
		{/* Avatar + Name */}
		<div className="d-flex align-items-center mb-3">
			<img
			src={avatarUrl}
			alt={name}
			className="rounded-circle me-3"
			style={{ width: "80px", height: "80px", objectFit: "cover" }}
			/>
			<div>
			<h5 className="mb-0 fw-bold">{name}</h5>
			<span className="badge bg-primary">Level {level}</span>
			</div>
		</div>

		{/* Bio */}
		<p className="text-muted small mb-1">
			<strong>Bio:</strong>
		</p>
		<p className="text-muted" style={{ minHeight: "50px" }}>
			{bio || "No bio yet."}
		</p>

		{/* Stats */}
		<div className="d-flex justify-content-between text-center my-3">
			<div>
			<div className="fw-bold">{followers}</div>
			<small className="text-muted">Followers</small>
			</div>
			<div>
			<div className="fw-bold">{following}</div>
			<small className="text-muted">Following</small>
			</div>
			<div>
			<div className="fw-bold">{xp}</div>
			<small className="text-muted">XP</small>
			</div>
		</div>

		<hr />

		{/* Progress to Level 30 */}
		<p className="mb-1 fw-semibold">Progress to Level 30</p>
		<div className="progress rounded-pill" style={{ height: "12px" }}>
			<div
			className="progress-bar bg-success"
			role="progressbar"
			style={{ width: `${progressTo30}%` }}
			aria-valuenow={progressTo30}
			aria-valuemin={0}
			aria-valuemax={100}
			/>
		</div>
		<small className="text-muted d-block mt-1">
			{progressTo30}% towards Level 30
		</small>

		<hr />

		{/* XP Until Next Level */}
		<p className="mb-0 fw-semibold">XP Needed for Next Level</p>
		<p className="text-muted small">{xpNeeded} XP remaining</p>
		</div>
	);
};

export default UserProfileCard;
