pragma solidity 0.5.0;

contract FeeLessInterfaceWithChainCall {

    mapping (address => bool) public trustedParties;

    modifier feeless(address sender) {
        if (!trustedParties[msg.sender]) {
            require(sender == msg.sender);
            _;
        } else {
            _;
        }
    }
}
