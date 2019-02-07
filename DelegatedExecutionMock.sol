pragma solidity 0.5.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/cryptography/ECDSA.sol";

contract DelegatedExecutionMock {
    using SafeMath for uint256;
    
    mapping (address => uint256) public usersNonce;
    
    function verify(address sender, uint256 nonce, bytes memory data, bytes memory sig) public pure returns(bool) {
        bytes32 hash = ECDSA.toEthSignedMessageHash(
            keccak256(abi.encodePacked(nonce, data))
        );
        return sender == ECDSA.recover(hash, sig);
    }
    
    function performDelegateExec(
        address sender,
        address to,
        bytes4 funcInterface,
        bytes memory data,
        uint256 nonce,
        bytes memory senderSig
    ) public {
        require(verify(sender,nonce,data,senderSig));
        require(usersNonce[sender] == nonce);
        usersNonce[sender] = usersNonce[sender].add(1);
        (bool ok,) = to.call(abi.encodePacked(funcInterface,uint256(sender),data));
        require(ok);
    }
}