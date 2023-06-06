import {
  ColonyFragment,
  ColonyMetadataFragment,
  ColonyMotionFragment,
  DomainMetadataFragment,
  MotionStakesFragment,
  StakerRewardFragment,
  UserStakesFragment,
  VoterRecordFragment,
} from './generated';
export * from './generated';

export type ColonyMotion = ColonyMotionFragment;
export type StakerReward = StakerRewardFragment;
export type DomainMetadata = DomainMetadataFragment;
export type ColonyMetadata = ColonyMetadataFragment;
export type Colony = ColonyFragment;
export type MotionStakes = MotionStakesFragment;
export type UserStakes = UserStakesFragment;
export type VoterRecord = VoterRecordFragment;
