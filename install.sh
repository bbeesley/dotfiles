#!/bin/bash

## function to check we're not on the master branch, deal with it if we are
function branchTest {
if [[ $(cd ~/dotfiles && git status ~/dotfiles | grep 'On branch master') ]]
then 
echo "We're on the master branch, making a new branch for this box"
box=$(hostname -s)
cd ~/dotfiles && git branch $box && git checkout $box
branchTest
else
echo "Great, we're not on the master branch, lets proceed"
fi
}

## function to do the setup, dotfiles present in home will be moved to the repo 
## and symlinked back, dotfiles in the repo but not in home will just be symlinked
function setup {
for i in $(ls ~/dotfiles | grep '^_'); do 
dotname=$(echo $i | sed 's|^_|.|')
if [[ ~/$dotname ]]
then
echo "You already have a $dotname in your home folder, I'll move it to the dotfiles directory and symlink it back"
mv ~/$dotname ~/dotfiles/$i && ln -s ~/dotfiles/$i ~/$dotname
else 
echo "You don't seem to have a $dotname in your home folder, linking the one from the dotfiles directory"
ln -s ~/dotfiles/$i ~/$dotname
fi
done
}

## Do the branch test
branchTest

## Do the setup
setup

## Quit
exit