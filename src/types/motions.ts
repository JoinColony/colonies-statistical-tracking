import { ColonyActionType } from '~types';

export enum MotionSide {
  YAY = 'yay',
  NAY = 'nay',
}

export enum MotionVote {
  NAY,
  YAY,
}

/*
 * Contract calls
 */
export enum ColonyOperations {
  MintTokens = 'mintTokens',
  CreateDomain = 'createDomain',
  EditDomain = 'editDomain',
}

export const motionNameMapping: { [key: string]: ColonyActionType } = {
  [ColonyOperations.MintTokens]: ColonyActionType.MintTokensMotion,
  // makePaymentFundedFromDomain: ColonyMotions.PaymentMotion,
  // unlockToken: ColonyMotions.UnlockTokenMotion,
  [ColonyOperations.CreateDomain]: ColonyActionType.CreateDomainMotion,
  [ColonyOperations.EditDomain]: ColonyActionType.EditDomainMotion,
  // editColony: ColonyMotions.ColonyEditMotion,
  // setUserRoles: ColonyMotions.SetUserRolesMotion,
  // moveFundsBetweenPots: ColonyMotions.MoveFundsMotion,
  // upgrade: ColonyMotions.VersionUpgradeMotion,
  // emitDomainReputationPenalty: ColonyMotions.EmitDomainReputationPenaltyMotion,
  // emitDomainReputationReward: ColonyMotions.EmitDomainReputationRewardMotion,
};

interface MotionStakeFragment {
  [MotionSide.NAY]: string;
  [MotionSide.YAY]: string;
}

export interface MotionStakes {
  raw: MotionStakeFragment;
  percentage: MotionStakeFragment;
}

type MotionVotes = MotionStakes;

export interface VoterRecord {
  address: string;
  voteCount: string;
  vote: number | null;
}

export interface MotionData {
  motionId: string;
  nativeMotionId: string;
  usersStakes: UserStakes[];
  motionStakes: MotionStakes;
  remainingStakes: [string, string];
  userMinStake: string;
  requiredStake: string;
  rootHash: string; // For calculating user's max stake in client
  motionDomainId: string;
  stakerRewards: StakerReward[];
  isFinalized: boolean;
  createdBy: string;
  voterRecord: VoterRecord[];
  revealedVotes: MotionVotes;
  repSubmitted: string;
  skillRep: string;
}

export interface UserStakes {
  address: string;
  stakes: MotionStakes;
}

export interface StakerReward {
  address: string;
  rewards: MotionStakeFragment;
  isClaimed: boolean;
}

export interface MotionQuery {
  id: string;
  motionData: MotionData;
  createdAt: string;
}

export interface ExtensionParams {
  votingReputation?: VotingReputationParams;
}

interface VotingReputationParams {
  totalStakeFraction: string;
  voterRewardFraction: string;
  userMinStakeFraction: string;
  maxVoteFraction: string;
  stakePeriod: string;
  submitPeriod: string;
  revealPeriod: string;
  escalationPeriod: string;
}
