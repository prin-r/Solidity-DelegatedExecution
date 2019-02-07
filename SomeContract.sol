pragma solidity 0.5.0;

import './FeeLessInterfaceWithChainCall.sol';

contract SomeContract is FeeLessInterfaceWithChainCall {
    
    uint256 public count = 0;
    
    mapping (address => uint256) public myNumber;
    mapping (uint256 => string) public numberToString;

    constructor(address[] memory addrs) public {
        for (uint256 i = 0; i < addrs.length; i++) {
            trustedParties[addrs[i]] = true;
        }
        trustedParties[address(this)] = true;
    }
    
    function setNumberToString(address sender, uint256 n, string memory s) public feeless(sender) {
        numberToString[n] = s;
    }
    
    function setMyNumber(address sender, uint256 n) public feeless(sender) {
        myNumber[sender] = n;
    }
    
    function doSomethingAndCall(
        address sender,
        address to,
        uint256 n1,
        bytes4 sig,
        bytes memory data
    )
    feeless(sender)
    public {
        count = n1;
        (bool ok,) = to.call(abi.encodePacked(sig, uint256(sender), data));
        require(ok);
    }

}
